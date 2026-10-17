import ChangePasswordPage from "../components/ChangePasswordPage";

export const metadata = {
  title: "Contraseña | Society . E X E",
  description: "Actualiza la contraseña de tu cuenta del dashboard de Society . E X E.",
  robots: { index: false, follow: false },
};

export default function ChangePasswordRoute() {
  return <ChangePasswordPage />;
}
