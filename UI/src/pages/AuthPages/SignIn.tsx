import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Entrar | Gestão Financeira"
        description="Acesso ao sistema de Gestão Financeira"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
