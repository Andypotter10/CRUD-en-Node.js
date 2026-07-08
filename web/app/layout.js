import "./styles.css";

export const metadata = {
  title: "Administración de personas",
  description: "CRUD protegido con Amazon Cognito"
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
