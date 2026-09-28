import { env } from "@repo/env/server";

import jwt from "jsonwebtoken";

export interface PayloadSchema{
  id?:string,
  name?:string,
  email?:string
};

export interface Input{
    payload:PayloadSchema,
    jwt_secret?:string,
    options?:jwt.SignOptions
}
export const signjwt = async (data:Input)=>{
  const token =  jwt.sign(data.payload,data.jwt_secret || env.JWT_SECRET,data.options)
  return token
}

export const verifyjwt = async (token:string)=>{
  const payload =  jwt.verify(token,env.JWT_SECRET) as PayloadSchema;
  return payload
}

export const generateResetLink = async (email:string)=>{
  const token = await signjwt({payload:{id:email}});
  const resetUrl = new URL('/reset-password', env.ALLOWED_ORIGINS[0]);
  resetUrl.searchParams.set('token', token);
  resetUrl.searchParams.set('email', email);
  const reset_link = resetUrl.toString();
  return {token,reset_link}
}

