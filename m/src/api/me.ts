import { axiosInstance } from "@/axios";
import type { CreateUserResponse, CreateUserSchema, User } from "@repo/types";

type CreatedUser = NonNullable<CreateUserResponse["data"]>;

export async function createUser(data: CreateUserSchema): Promise<CreatedUser> {
  const { data: user } = await axiosInstance.post<CreatedUser>("/users", data);
  if (!user) throw new Error("User create returned no data");
  return user;
}

export async function getMe(): Promise<User> {
  const { data: user } = await axiosInstance.get<User>("/users/me");
  if (!user) throw new Error("User not found");
  return user;
}
