import LegalLayout from "../components/LegalLayout";

export const metadata = {
  title: "Términos del dashboard | Society . E X E",
  description: "Condiciones de acceso y uso del dashboard privado de Society . E X E.",
  robots: { index: false, follow: true },
};

const SECTION_CLASS = "legal-section";

export default function TermsPage() {
  return (
    <LegalLayout
      title="Términos de servicio"
      description="Reglas de acceso y uso del espacio de trabajo interno de Society . E X E."
      currentPage="terms"
    >
      <section className={SECTION_CLASS}>
        <h2>1. Alcance y acceso autorizado</h2>
        <p>
          Estos términos regulan el acceso al dashboard de Society . E X E
          (el “Dashboard”), una herramienta privada para miembros autorizados
          del equipo. El Dashboard no es un servicio público ni permite crear
          una cuenta por iniciativa propia. Al iniciar sesión o utilizar sus
          funciones, aceptas estas condiciones. Si no estás de acuerdo, no
          accedas ni continúes usando el Dashboard.
        </p>
      </section>

      <section className={SECTION_CLASS}>
        <h2>2. Cuentas, credenciales y permisos</h2>
        <p>
          Las cuentas son creadas o habilitadas por personas autorizadas de
          Society . E X E. Cada persona debe usar únicamente la cuenta que le
          fue asignada, mantener sus credenciales bajo su control y avisar sin
          demora si sospecha que alguien más accedió a ella. No compartas
          contraseñas, sesiones ni enlaces de acceso.
        </p>
        <p>
          Las funciones visibles dependen del rol asignado a la cuenta. No
          intentes elevar privilegios, eludir controles, acceder a información
          o cuentas ajenas, ni realizar cambios fuera de las facultades que te
          fueron concedidas. Los responsables autorizados pueden actualizar
          roles, suspender o retirar el acceso cuando sea necesario para
          proteger al equipo o al Dashboard.
        </p>
      </section>

      <section className={SECTION_CLASS}>
        <h2>3. Uso permitido y seguridad</h2>
        <p>
          Usa el Dashboard únicamente para las tareas internas relacionadas
          con Society . E X E y conforme a las instrucciones del equipo. No
          debes interferir con su funcionamiento, probar o explotar sus
          controles sin autorización, introducir código malicioso, extraer
          datos en forma no autorizada ni usarlo para infringir derechos o
          normas aplicables.
        </p>
        <p>
          No cargues secretos, datos bancarios, información de autenticación ni
          datos personales que no sean necesarios para la tarea. Si detectas
          una vulnerabilidad, una exposición de información o una actividad
          sospechosa, notifícala a{" "}
          <a href="mailto:info@society-exe.site">info@society-exe.site</a> y no
          intentes acceder, modificar o divulgar datos adicionales.
        </p>
      </section>

      <section className={SECTION_CLASS}>
        <h2>4. Perfil y cuentas de terceros</h2>
        <p>
          Puedes actualizar los datos de perfil disponibles para tu cuenta y,
          si la función está habilitada, vincular o desconectar cuentas de
          Google, GitHub o GitLab. Al conectar un proveedor, autorizas el
          intercambio de los datos de perfil y permisos que se muestran en su
          flujo de autorización para habilitar la conexión o el inicio de
          sesión de una cuenta previamente vinculada.
        </p>
        <p>
          Las cuentas conectadas siguen sujetas a los términos y políticas del
          proveedor correspondiente. Society . E X E no controla sus servicios,
          disponibilidad ni decisiones. Puedes desconectar una cuenta desde el
          perfil del Dashboard; al hacerlo, la conexión deja de estar
          disponible para las funciones que la requieran.
        </p>
      </section>

      <section className={SECTION_CLASS}>
        <h2>5. Propiedad intelectual e información confidencial</h2>
        <p>
          El Dashboard y sus contenidos pertenecen a Society . E X E, a sus
          respectivos titulares o a sus licenciantes. En particular, los
          derechos sobre el núcleo tecnológico preexistente de OTP-X —incluidos
          su código, arquitectura, algoritmos, metodología y documentación—
          corresponden a Ahiézer Rada, conforme a la información del proyecto.
          El acceso no transfiere derechos ni concede licencias de uso fuera de
          las tareas autorizadas.
        </p>
        <p>
          Trata como confidencial la información interna a la que accedas y
          respeta cualquier acuerdo de confidencialidad aplicable. No la copies,
          publiques, distribuyas o uses fuera del propósito autorizado, salvo
          permiso escrito del titular correspondiente o cuando la ley lo
          permita.
        </p>
      </section>

      <section className={SECTION_CLASS}>
        <h2>6. Alcance del proyecto y disponibilidad</h2>
        <p>
          El Dashboard es una herramienta de gestión interna; no es un servicio
          bancario, financiero, de autenticación para clientes ni de asesoría.
          OTP-X continúa en investigación y desarrollo, sin certificación
          independiente ni aprobación regulatoria, y no se ofrece como producto
          comercial. La información de proyectos puede cambiar y no constituye
          una promesa de disponibilidad o resultado.
        </p>
        <p>
          Se procura mantener el Dashboard operativo y seguro, pero puede
          interrumpirse o modificarse por mantenimiento, incidentes, cambios
          técnicos o necesidades del negocio. No se garantiza disponibilidad
          ininterrumpida ni ausencia total de errores.
        </p>
      </section>

      <section className={SECTION_CLASS}>
        <h2>7. Cambios y contacto</h2>
        <p>
          Estos términos pueden actualizarse cuando cambie el Dashboard, su
          funcionamiento o las necesidades de Society . E X E. La versión
          vigente y su fecha de actualización se publicarán en esta página.
          Para consultas o solicitudes relacionadas con el acceso, escribe a{" "}
          <a href="mailto:info@society-exe.site">info@society-exe.site</a>.
        </p>
        <p>
          Estos términos complementan, y no reemplazan, los acuerdos escritos
          que rijan una relación de trabajo, colaboración, confidencialidad o
          propiedad intelectual.
        </p>
      </section>
    </LegalLayout>
  );
}
