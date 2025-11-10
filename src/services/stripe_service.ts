import Stripe from "stripe";
import dotenv from "dotenv";
import User from "../models/user_model";
import Subscription from "../models/subscription_model";
import Commission from "../models/commission_model";
import { PLANS } from "../config/subscription_plans";
import { REFERRAL_CONFIG, calculateCommission } from "../config/rewards";
import { Request, Response } from "express";
import mongoose from "mongoose";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const clientUrl = process.env.CLIENT_URL!;

if (!endpointSecret) {
  throw new Error("Stripe webhook secret is not defined");
}

if (!clientUrl) {
  throw new Error("Client URL is not defined");
}

export const createStripeCustomer = async (user: any) => {
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.full_name,
    metadata: {
      userId: user._id.toString(),
    },
  });

  await User.findByIdAndUpdate(user._id, {
    stripeCustomerId: customer.id,
  });

  return customer;
};

export const createCheckoutSession = async (userId: string, planId: string) => {
  const plan = Object.values(PLANS).find((p) => p.id === planId);
  if (!plan) throw new Error("Plan not found");

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await createStripeCustomer(user);
    customerId = customer.id;
    user.stripeCustomerId = customer.id;
    await user.save();
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: plan.stripePriceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${clientUrl}/api/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl}/api/subscription/canceled`,
    metadata: {
      userId: user._id.toString(),
      planId: plan.id,
      planName: plan.name,
    },
  });

  return session;
};

export const getSubscription = async (userId: string) => {
  const subscription = await Subscription.findOne({
    userId,
    status: { $in: ["active", "past_due"] },
  });
  return subscription;
};

export const cancelSubscription = async (userId: string) => {
  const subscription = await getSubscription(userId);
  if (!subscription) throw new Error("No active subscription found");

  const canceledSubscription = await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    {
      cancel_at_period_end: true,
    }
  );

  await Subscription.findByIdAndUpdate(subscription._id, {
    cancelAtPeriodEnd: true,
  });

  await User.findByIdAndUpdate(userId, {
    "subscription.cancelAtPeriodEnd": true,
  });

  return canceledSubscription;
};

export const reactivateSubscription = async (userId: string) => {
  const subscription = await Subscription.findOne({
    userId,
    cancelAtPeriodEnd: true,
  });
  if (!subscription) throw new Error("No subscription to reactivate");

  const reactivatedSubscription = await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    {
      cancel_at_period_end: false,
    }
  );

  await Subscription.findByIdAndUpdate(subscription._id, {
    cancelAtPeriodEnd: false,
  });

  await User.findByIdAndUpdate(userId, {
    "subscription.cancelAtPeriodEnd": false,
  });

  return reactivatedSubscription;
};

export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Use a transaction to ensure data consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  // console.log("event", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    await session.commitTransaction();
    res.json({ received: true });
  } catch (error) {
    await session.abortTransaction();
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook handler failed" });
  } finally {
    session.endSession();
  }
};

const handleCheckoutCompleted = async (session: Stripe.Checkout.Session) => {
  const userId = session.metadata?.userId;
  if (!userId) return;

  // Get the subscription
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  await handleSubscriptionUpdated(subscription);
};

const handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
  const customerId = subscription.customer as string;
  const data = subscription.items.data[0];

  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) return;

  const plan = Object.values(PLANS).find(
    (p) => p.stripePriceId === data.price.id
  );
  if (!plan) return;

  // First, check if we already have this subscription
  let subscriptionRecord = await Subscription.findOne({
    $or: [
      { stripeSubscriptionId: subscription.id },
      {
        userId: user._id,
        status: { $in: ["active", "trialing", "past_due", "incomplete"] },
      },
    ],
  });

  // Prepare subscription data
  const subscriptionData = {
    userId: user._id,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
    status: subscription.status,
    planId: plan.id,
    planName: plan.name,
    priceId: data.price.id,
    currentPeriodStart: new Date(data.current_period_start * 1000),
    currentPeriodEnd: new Date(data.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000)
      : undefined,
    trialStart: subscription.trial_start
      ? new Date(subscription.trial_start * 1000)
      : undefined,
    trialEnd: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : undefined,
  };

  // If we found an existing subscription, update it
  if (subscriptionRecord) {
    // If we found a different subscription for this user, cancel it
    if (subscriptionRecord.stripeSubscriptionId !== subscription.id) {
      await Subscription.updateOne(
        { _id: subscriptionRecord._id },
        {
          status: "canceled",
          canceledAt: new Date(),
          cancelAtPeriodEnd: true,
        }
      );
    }
    // Update the existing subscription
    await Subscription.updateOne(
      { _id: subscriptionRecord._id },
      { $set: subscriptionData }
    );
  } else {
    // Create new subscription if none exists
    subscriptionRecord = new Subscription(subscriptionData);
    await subscriptionRecord.save();
  }

  // Update user's subscription info
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        "subscription.planId": plan.id,
        "subscription.status": subscription.status,
        "subscription.currentPeriodEnd": new Date(
          data.current_period_end * 1000
        ),
        "subscription.cancelAtPeriodEnd": subscription.cancel_at_period_end,
      },
    }
  );

  return subscriptionRecord;
};

const handleSubscriptionDeleted = async (subscription: Stripe.Subscription) => {
  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    { status: "canceled", canceledAt: new Date() }
  );

  const customerId = subscription.customer as string;
  const user = await User.findOne({ stripeCustomerId: customerId });
  if (user) {
    await User.findByIdAndUpdate(user._id, {
      subscription: {
        planId: null,
        status: "canceled",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    });
  }
};

const handlePaymentFailed = async (invoice: any) => {
  if (invoice.subscription) {
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: invoice.subscription },
      { status: "past_due" }
    );
  }
};

const handlePaymentSucceeded = async (invoice: any) => {
  try {
    // Get subscription ID from either direct field or parent object
    const subscriptionId = invoice.subscription || 
                         (invoice.parent?.subscription_details?.subscription as string | undefined);
    
    if (!subscriptionId) {
      console.log('No subscription ID found in invoice');
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await handleSubscriptionUpdated(subscription);
    await handleReferralCommission(invoice, subscription);
  } catch (error) {
    console.error('Error in handlePaymentSucceeded:', error);
  }
};

/**
 * Handle referral commission when a payment succeeds
 */
const handleReferralCommission = async (
  invoice: Stripe.Invoice,
  subscription: Stripe.Subscription
) => {
  try {
    // Get the user who made the payment
    const customerId = invoice.customer as string;
    const user = await User.findOne({ stripeCustomerId: customerId });
    if (!user || !user.invitedBy) return;

    // Get the plan details
    const priceId = subscription.items.data[0].price.id;
    const plan = Object.values(PLANS).find((p) => p.stripePriceId === priceId);
    if (!plan) return;

    // Check if commission already exists for this subscription
    const existingCommission = await Commission.findOne({
      subscriptionId: subscription.id,
      referredUserId: user._id,
    });

    if (existingCommission) {
      console.log(
        `Commission already exists for subscription ${subscription.id}`
      );
      return;
    }

    // Calculate commission (20% of subscription price)
    const commissionAmount = calculateCommission(plan.price);

    // Create commission record
    const commission = await Commission.create({
      referrerId: user.invitedBy,
      referredUserId: user._id,
      subscriptionId: subscription.id,
      planId: plan.id,
      subscriptionAmount: plan.price,
      commissionAmount,
      commissionRate: REFERRAL_CONFIG.COMMISSION_RATE,
      currency: plan.currency,
      status: "pending",
      stripePaymentIntentId: invoice.id as string,
    });

    // Update referrer's wallet
    const referrer = await User.findById(user.invitedBy);
    if (referrer) {
      await User.findByIdAndUpdate(user.invitedBy, {
        $inc: {
          "wallet.balance": commissionAmount,
          "wallet.totalEarned": commissionAmount,
        },
      });

      // Mark commission as paid
      commission.status = "paid";
      commission.paidAt = new Date();
      await commission.save();

      console.log(
        `Commission of €${commissionAmount} credited to user ${referrer._id} for referral ${user._id}`
      );
    }
  } catch (error) {
    console.error("Error handling referral commission:", error);
  }
};

export const getUserStripeInvoiceHistory = async (customerId: string) => {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      expand: ["data.subscription"],
    });

    return invoices.data.map((invoice) => {
      const subscription = (invoice as any).subscription as
        | Stripe.Subscription
        | string
        | null;

      return {
        id: invoice.id,
        amount: invoice.amount_paid,
        status: invoice.status,
        created: new Date(invoice.created * 1000),
        subscriptionId:
          subscription && typeof subscription !== "string"
            ? subscription.id
            : subscription,
        subscriptionStatus:
          subscription && typeof subscription !== "string"
            ? subscription.status
            : null,
      };
    });
  } catch (error) {
    console.error("Error fetching invoice history:", error);
    return [];
  }
};
