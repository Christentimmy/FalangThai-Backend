import cloudinary from "../config/cloudinary";

const generateThumbnail = (
  publicId: string,
  options: { width?: number; height?: number; time?: number } = {}
): string => {
  const { width = 320, height = 240, time = 2 } = options;

  // Generate a thumbnail from a specific frame (default 2s)
  const thumbnailUrl = cloudinary.url(`${publicId}.jpg`, {
    resource_type: "video",
    transformation: [
      { width, height, crop: "fill" },
      { start_offset: time }, // snapshot at X seconds
    ],
  });

  return thumbnailUrl;
};

export default generateThumbnail;
