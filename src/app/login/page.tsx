import { AuthPage } from "@/components/auth-page";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  return <AuthPage status={(await searchParams).status} />;
}
