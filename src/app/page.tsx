import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { sessionClaims } = await auth();

  if (sessionClaims) {
    redirect("/feed");
  } else {
    redirect("/sign-in");
  }
}
