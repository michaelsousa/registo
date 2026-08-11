import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Fingerprint, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_EMAIL = "admin@pontofacil.com";
const DEFAULT_PASSWORD = "admin123";

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState(() => localStorage.getItem("saved_email") || DEFAULT_EMAIL);
  const [password, setPassword] = useState(() => localStorage.getItem("saved_password") || DEFAULT_PASSWORD);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  // Cria o admin padrão no primeiro acesso (se ainda não existir)
  useEffect(() => {
    if (localStorage.getItem("default_admin_ready")) return;
    (async () => {
      try {
        await signUp(DEFAULT_EMAIL, DEFAULT_PASSWORD, "Administrador");
      } catch {
        // já existe — ignora
      } finally {
        localStorage.setItem("default_admin_ready", "1");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, fullName);
        toast.success("Conta criada! Verifique seu email para confirmar.");
      } else {
        await signIn(email, password);
        localStorage.setItem("saved_email", email);
        localStorage.setItem("saved_password", password);
        toast.success("Login realizado com sucesso!");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
            <Fingerprint className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="font-heading text-2xl">PontoFácil</CardTitle>
          <CardDescription>
            {isSignUp ? "Crie sua conta para registrar ponto" : "Entre na sua conta"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="pl-10"
                  minLength={6}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Aguarde..." : isSignUp ? "Criar conta" : "Entrar"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">
              Acesso padrão: admin@pontofacil.com / admin123
            </p>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp ? "Já tem conta? Entre aqui" : "Não tem conta? Cadastre-se"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
