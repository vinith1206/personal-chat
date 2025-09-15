import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
	{
		email: { type: String, required: true, unique: true, lowercase: true, index: true },
		name: { type: String, required: true },
		avatarUrl: { type: String },
		passwordHash: { type: String, required: true },
		status: { type: String, enum: ['online', 'offline'], default: 'offline' }
	},
	{ timestamps: true }
);

export default mongoose.model('User', userSchema);
