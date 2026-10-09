import User from '@repo/auth/models/user';

export interface CreateUserInput {
  name: string;
  email: string;
  password?: string;
  picture?: string;
}

export const findUserByEmail = (email: string) => User.findOne({ email });

export const findUserByEmailWithPassword = (email: string) =>
  User.findOne({ email }).select('+password');

export const findUserById = (id: string) => User.findById(id);

export const createUser = (input: CreateUserInput) => User.create(input);

export const updateUserPasswordHash = (userId: string, password: string) =>
  User.findByIdAndUpdate(userId, { $set: { password } }, { new: true });

const userService = {
  createUser,
  findUserByEmail,
  findUserByEmailWithPassword,
  findUserById,
  updateUserPasswordHash,
};

export default userService;
