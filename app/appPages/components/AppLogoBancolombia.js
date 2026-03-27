export default function AppLogoBancolombia() {
  return (
    <app-logo-bancolombia className="bc-flex bc-justify-content-center">
      <div className="bc-flex bc-justify-content-center bc-mt-5">
        <bc-logo
          name="bancolombia-horizontal-no-spacing"
          size="11.5rem"
          alt="logo"
          className="logo bc-flex bc-justify-content-center logo_filter bc-logo"
          aria-hidden="true"
          style={{ width: "11.5rem" }}
        >
          <img
            src="https://library-sdb.apps.bancolombia.com/bds/9.41.1/assets/icons/logos/bancolombia-horizontal-no-spacing.svg"
            alt="logo"
            style={{ width: "11.5rem", filter: "invert(100%) brightness(200%)" }}
          />
        </bc-logo>
      </div>
    </app-logo-bancolombia>
  );
}
