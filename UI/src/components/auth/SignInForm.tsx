import { useState } from "react";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";

export type SignInCredentials = {
  email: string;
  password: string;
  remember: boolean;
};

type SignInFormProps = {
  /** Quando informado, usa o serviço de auth do app (Gestão Financeira) */
  onLogin?: (credentials: SignInCredentials) => Promise<void>;
  initialEmail?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function SignInForm({ onLogin, initialEmail = "" }: SignInFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(Boolean(initialEmail));
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Informe o e-mail";
    else if (!isValidEmail(email)) next.email = "E-mail inválido";
    if (!password) next.password = "Informe a senha";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    const credentials: SignInCredentials = {
      email: email.trim(),
      password,
      remember,
    };

    try {
      if (onLogin) {
        await onLogin(credentials);
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: credentials.email, password: credentials.password }),
        });
        const data = await res.json();
        if (data?.ok && data?.accessToken) {
          localStorage.setItem("accessToken", data.accessToken);
          if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
          window.location.href = "/";
        } else {
          setError(data?.message || "Credenciais inválidas");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4">
        <div className="mb-8">
          <h1 className="mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90 sm:text-title-md">
            Entrar
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Acesse o sistema de Gestão Financeira
          </p>
        </div>

        {error && (
          <div className="mb-4">
            <Alert variant="error" title="Não foi possível entrar" message={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <Label>
              E-mail <span className="text-error-500">*</span>
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(ev) => {
                setEmail(ev.target.value);
                if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
              }}
              placeholder="admin@finance.local"
              autoComplete="email"
              error={Boolean(fieldErrors.email)}
              hint={fieldErrors.email}
            />
          </div>
          <div>
            <Label>
              Senha <span className="text-error-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(ev) => {
                  setPassword(ev.target.value);
                  if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
                }}
                placeholder="Sua senha"
                autoComplete="current-password"
                error={Boolean(fieldErrors.password)}
                hint={fieldErrors.password}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
                ) : (
                  <EyeCloseIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox checked={remember} onChange={setRemember} id="remember-me" />
            <label htmlFor="remember-me" className="text-sm text-gray-700 dark:text-gray-400">
              Lembrar e-mail neste dispositivo
            </label>
          </div>

          <Button type="submit" disabled={loading} className="w-full justify-center">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
