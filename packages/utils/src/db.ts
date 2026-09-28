export const withTimestamps = <T extends { createdAt?: Date }>(data: T) => ({
  ...data,
  createdAt: data.createdAt || new Date(),
  updatedAt: new Date(),
});
