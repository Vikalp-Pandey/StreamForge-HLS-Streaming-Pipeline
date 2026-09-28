import {
  type InferSchemaType,
  type Model,
  model,
  Schema,
} from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, select: false },
    picture: { type: String },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

const User = (model('User', userSchema)) as Model<UserDocument>;

export default User;
