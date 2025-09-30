import { Schema, model, Document, Types } from 'mongoose';

// Story Interface
export interface IStory extends Document {
  userId: Types.ObjectId;
  displayName: string;
  avatarUrl: string;
  stories: {
    content?: string;
    mediaUrl: string;
    thumbnailUrl?: string,
    publicId: string;
    mediaType: 'image' | 'video';
    createdAt: Date;
    expiresAt: Date;
    viewedBy: Types.ObjectId[];
  }[];
}

// Story Schema
const StorySchema = new Schema<IStory>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  avatarUrl: {
    type: String,
    required: true,
  },
  stories: [
    {
      content: {
        type: String,
        required: false,
        trim: true,
      },
      mediaUrl: {
        type: String,
        required: true,
      },
      thumbnailUrl: {
        type: String,
        required: false,
      },
      publicId: {  // ⬅️ New field to store Cloudinary public ID
        type: String,
        required: true,
      },
      mediaType: {
        type: String,
        enum: ['image', 'video'],
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      expiresAt: {
        type: Date,
        default: function () {
          const date = new Date();
          date.setHours(date.getHours() + 24); // Auto-delete after 24 hours
          return date;
        },
      },
      viewedBy: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },
  ],
});

// Indexes for optimized queries
StorySchema.index({ userId: 1, 'stories.createdAt': -1 });

export const Story = model<IStory>('Story', StorySchema);
