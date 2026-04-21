import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "No se pudo iniciar sesión");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden p-12 text-white lg:flex bg-sgr-gradient">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
            <span className="text-3xl font-bold tracking-tight">SGR</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Bienvenido a SGR</h1>
          <p className="text-base text-white/90 text-balance leading-relaxed">
            Sistema de Gestión para Restaurante.
            <br />
            Administra mesas, pedidos, cocina,
            <br />
            facturación e inventario en un solo lugar.
          </p>
        </div>
      </aside>

      <main className="flex w-full flex-col items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-foreground">SGR</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">Iniciar Sesión</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="carlos.mesa@sgr.com"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span className="text-foreground">Recordarme</span>
              </label>
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full shadow-soft"
              disabled={submitting}
            >
              {submitting ? "Entrando…" : "Iniciar Sesión"}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-xs uppercase tracking-wider text-muted-foreground">
                  o
                </span>
              </div>
            </div>

            <Button type="button" variant="outline" size="lg" className="w-full">
              Acceder como Invitado
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
