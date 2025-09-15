import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema(
	{
		userName: { type: String, required: true },
		emoji: { type: String, required: true }
	},
	{ _id: false, timestamps: true }
);

const attachmentSchema = new mongoose.Schema(
	{
		url: { type: String, required: true },
		mimeType: { type: String, required: true },
		fileName: { type: String },
		size: { type: Number }
	},
	{ _id: false }
);

const messageSchema = new mongoose.Schema(
	{
		roomId: { type: String, index: true },
		senderName: { type: String, required: true },
		text: { type: String },
		attachments: [attachmentSchema],
		reactions: [reactionSchema],
		editedAt: { type: Date },
		deletedAt: { type: Date }
	},
	{ timestamps: true }
);

export default mongoose.model('Message', messageSchema);
