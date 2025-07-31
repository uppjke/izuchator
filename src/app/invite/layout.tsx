import { Header } from "@/components/header";

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header hideAuthButtons={true} />
      {children}
    </>
  );
}
