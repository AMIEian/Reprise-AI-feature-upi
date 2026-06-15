import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  // FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import { showSuccessToast } from "@/lib/errorHandler";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Prevent double-submit
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      showSuccessToast("Welcome back!");
      navigate("/");
    } catch (err: any) {
      // Show specific error message
      if (err.response?.status === 403) {
        const msg =
          "Your admin account is inactive. Contact system administrator.";
        setError(msg);
        toast.error(msg, { duration: 5000 });
      } else if (err.response?.status === 401) {
        const msg = "Invalid email or password. Please check and try again.";
        setError(msg);
        toast.error(msg, { duration: 4000 });
      } else if (
        err.code === "ECONNABORTED" ||
        err.message.includes("timeout")
      ) {
        const msg =
          "Connection timeout. Please check your internet and try again.";
        setError(msg);
        toast.error(msg, {
          duration: 4000,
          action: {
            label: "Retry",
            onClick: () => handleSubmit(e),
          },
        });
      } else if (!err.response) {
        const msg = "Network error. Please check your connection.";
        setError(msg);
        toast.error(msg, {
          duration: 4000,
          action: {
            label: "Retry",
            onClick: () => handleSubmit(e),
          },
        });
      } else {
        const msg =
          "Unable to connect to login service. Please try again later.";
        setError(msg);
        toast.error(msg, {
          duration: 4000,
          action: {
            label: "Retry",
            onClick: () => handleSubmit(e),
          },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Admin Portal</CardTitle>
          <CardDescription>Login As Admin</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  {/* <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a> */}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="*********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              </Field>
            </FieldGroup>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
