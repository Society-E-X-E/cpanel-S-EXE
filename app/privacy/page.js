import LegalLayout from "../components/LegalLayout";

export const metadata = {
  title: "Privacidad del dashboard | Society . E X E",
  description: "Cómo se trata la información personal al usar el dashboard privado de Society . E X E.",
  robots: { index: false, follow: true },
};

const SECTION_CLASS = "legal-section";

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Política de privacidad"
      description="Información personal y técnica tratada al acceder y usar el dashboard de Society . E X E."
      currentPage="privacy"
    >
      <section className={SECTION_CLASS}>
        <h2>1. A quién y a qué aplica</h2>
        <p>
          Esta política describe el tratamiento de información asociado al
          Dashboard privado de Society . E X E y sus funciones de gestión
          interna. No describe el tratamiento de un producto comercial o de
          OTP-X: OTP-X está en investigación y desarrollo y no se ofrece como
          servicio al público.
        </p>
      </section>

      <section className={SECTION_CLASS}>
        <h2>2. Información que se trata</h2>
        <ul>
          <li>
            <strong>Cuenta y perfil:</strong> nombre de usuario, correo
            electrónico, teléfono, biografía, rol asignado y fecha de creación.
            Las cuentas son habilitadas por administradores; el Dashboard no
            ofrece registro público.
          </li>
          <li>
            <strong>Autenticación y seguridad:</strong> contraseña almacenada
            como hash, identificador de sesión y datos técnicos de solicitudes
            necesarios para autenticar, mantener y proteger el acceso.
          </li>
          <li>
            <strong>Cuentas conectadas:</strong> si eliges vincular Google,
            GitHub o GitLab, recibimos los datos de perfil autorizados (por
            ejemplo, identificador de proveedor, nombre, usuario, URL y avatar),
            los permisos solicitados y el token necesario para mantener la
            conexión. Los tokens OAuth se almacenan cifrados. El correo del
            proveedor no se importa como parte del perfil OAuth de este panel.
          </li>
          <li>
            <strong>Uso y rendimiento:</strong> el Dashboard incorpora Vercel
            Analytics y Speed Insights, que pueden procesar métricas de uso,
            navegación y rendimiento técnico conforme a la configuración del
            servicio y las políticas de Vercel.
          </li>
        </ul>
        <p>
          Los proveedores de alojamiento, base de datos y seguridad también
          pueden procesar datos técnicos de conexión (como dirección IP, fecha,
          hora, navegador y solicitudes) para prestar, mantener y proteger el
          servicio. Los datos concretos y los plazos de los registros dependen
          de la configuración y políticas de esos proveedores.
        </p>
      </section>

      <section className={SECTION_CLASS}>
        <h2>3. Para qué se usa</h2>
        <p>
          La información se usa para crear y administrar las cuentas del
          equipo; autenticar usuarios y aplicar permisos por rol; mostrar y
          actualizar perfiles; vincular, mantener o desconectar integraciones
          OAuth; proteger el Dashboard, investigar incidentes y mantener su
          funcionamiento; y conocer métricas agregadas de uso y rendimiento
          para mejorar la herramienta interna.
        </p>
      </section>

      <section className={SECTION_CLASS}>
        <h2>4. Sesiones, proveedores y comunicaciones</h2>
        <p>
          Al iniciar sesión, el Dashboard utiliza una cookie de sesión llamada
          <code> authToken</code>, marcada como HttpOnly y SameSite=Strict, con
          una duración máxima de 90 minutos; en producción también usa el
          atributo Secure. La cookie permite mantener la sesión autenticada y
          se elimina al cerrar sesión o al expirar.
        </p>
        <p>
          Si eliges una opción de acceso o conexión social, el proveedor
          correspondiente recibe la solicitud y procesa la autenticación según
          sus propias condiciones y políticas. En producción, los datos pueden
          alojarse o procesarse mediante los proveedores técnicos configurados
          para el Dashboard, incluidos Vercel y Neon. No controlamos las
          prácticas independientes de dichos terceros.
        </p>
      </section>

      <section className={SECTION_CLASS}>
        <h2>5. Acceso, conservación y seguridad</h2>
        <p>
          El acceso a datos personales se limita a las cuentas y roles internos
          que necesitan la información para administrar el Dashboard. No
          vendemos datos personales. La información de cuenta se conserva
          mientras la cuenta permanezca activa o sea necesaria para operar,
          proteger y administrar el servicio; al eliminar una cuenta, sus
          registros asociados se eliminan de la base de datos principal según
          las relaciones configuradas. Los registros técnicos o copias de
          respaldo de proveedores pueden conservarse conforme a sus propias
          políticas.
        </p>
        <p>
          Aplicamos medidas técnicas y organizativas acordes con el uso interno
          del servicio, incluido el almacenamiento cifrado de tokens OAuth y el
          almacenamiento de contraseñas como hash. Ningún sistema de
          transmisión o almacenamiento puede garantizar seguridad absoluta.
        </p>
      </section>

      <section className={SECTION_CLASS}>
        <h2>6. Tus opciones y solicitudes</h2>
        <p>
          Puedes corregir los campos editables de tu perfil y desconectar una
          cuenta social desde el Dashboard. Para consultar, corregir o solicitar
          la eliminación de información personal, o para plantear una pregunta
          sobre privacidad, escribe a{" "}
          <a href="mailto:info@society-exe.site">info@society-exe.site</a>.
          Atenderemos las solicitudes de acuerdo con la normativa aplicable y
          las necesidades legítimas de seguridad y administración del servicio.
        </p>
      </section>

      <section className={SECTION_CLASS}>
        <h2>7. Cambios a esta política</h2>
        <p>
          Esta política puede actualizarse si cambian el Dashboard, sus
          proveedores o sus prácticas de tratamiento. Publicaremos la versión
          vigente y su fecha de actualización en esta página.
        </p>
      </section>
    </LegalLayout>
  );
}
