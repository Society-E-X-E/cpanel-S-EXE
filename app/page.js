import PanelShell from "./appPages/components/PanelShell";
import AuthForm from "./appPages/components/AuthForm";
import Footer from "./appPages/components/Footer";

export default function Home() {
  return (
    <PanelShell
      title="Acceso al C-Panel"
      subtitle="Ingresa tus credenciales para continuar con el flujo de verificación y administración."
      footer={<Footer />}
      compact
    >
      <AuthForm />
    </PanelShell>
  );
}
