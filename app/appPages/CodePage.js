import PanelShell from "./components/PanelShell";
import CodeForm from "./components/CodeForm";
import Footer from "./components/Footer";

export default function CodePage({ searchParams }) {
  const initialStep = parseInt(searchParams?.step, 10) || 1;
  const user = searchParams?.user || "";
  const phone = searchParams?.phone || "";

  return (
    <PanelShell
      title="Verificación de seguridad"
      subtitle="Completa el flujo de validación para continuar con el acceso del usuario."
      footer={<Footer />}
      compact
    >
      <CodeForm initialStep={initialStep} user={user} phone={phone} />
    </PanelShell>
  );
}
