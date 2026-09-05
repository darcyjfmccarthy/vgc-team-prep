"use server";

import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import {
  login,
  register,
  requestPasswordReset,
  resetPassword,
} from "@/modules/auth/service";
import { revokeCurrentSession } from "@/modules/auth/sessions";

const errorTarget = (path: string, error: unknown) =>
  redirect(
    `${path}?error=${encodeURIComponent(error instanceof AppError ? error.message : "Something went wrong.")}`,
  );

export async function registerAction(formData: FormData) {
  try {
    await register({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      displayName: String(formData.get("displayName") ?? ""),
    });
  } catch (error) {
    errorTarget("/register", error);
  }
  redirect("/");
}

export async function loginAction(formData: FormData) {
  try {
    await login({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
  } catch (error) {
    errorTarget("/login", error);
  }
  redirect("/");
}

export async function logoutAction() {
  await revokeCurrentSession();
  redirect("/login");
}

export async function requestResetAction(formData: FormData) {
  await requestPasswordReset(String(formData.get("email") ?? ""));
  redirect("/reset-password?sent=1");
}

export async function resetPasswordAction(formData: FormData) {
  try {
    await resetPassword(
      String(formData.get("token") ?? ""),
      String(formData.get("password") ?? ""),
    );
  } catch (error) {
    errorTarget(
      `/reset-password?token=${encodeURIComponent(String(formData.get("token") ?? ""))}`,
      error,
    );
  }
  redirect("/login?reset=1");
}
