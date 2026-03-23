export default function Logo() {
  return (
    <div className="bc-flex bc-justify-content-center">
      <div className="bc-flex bc-justify-content-center bc-mt-5" style={{ width: '11.5rem' }}>
        <img
          src="/asset/images/bancolombia-horizontal-no-spacing.svg"
          alt="Bancolombia logo"
          width={184}
          height={40}
          style={{ width: '11.5rem', height: 'auto', display: 'block' }}
        />
      </div>
    </div>
  );
}
