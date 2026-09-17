import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: {
      type: String,
      enum: ["click", "view", "signup"],
      required: true,
      index: true,
    },
    userId: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    metadata: { type: Object, default: {} },
    partition: { type: Number, min: 0 },
    offset: { type: Number, min: 0 },
  },
  { timestamps: true }
);

eventSchema.index({ timestamp: -1 });
eventSchema.index({ eventType: 1, timestamp: -1 });
eventSchema.index({ userId: 1, timestamp: -1 });

export const Event = mongoose.model("Event", eventSchema);
