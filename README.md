# CRUD en AWS

Microservicio CRUD desarrollado con Node.js, Express, AWS Lambda, API Gateway, Amazon Cognito y RDS MySQL. Incluye una interfaz web en React con Next.js, colección de Postman, definición de infraestructura con AWS SAM y workflows de GitHub Actions.

El proyecto está preparado para desplegarse en la región de México (`mx-central-1`).

## Arquitectura

```text
Next.js / Amazon S3 → Cognito → API Gateway → Lambda → RDS MySQL
```

La API se publica mediante API Gateway y ejecuta el backend en AWS Lambda. Los datos se almacenan en MySQL usando Amazon RDS. Lambda se conecta directamente a la instancia privada de RDS y las credenciales se administran con AWS Secrets Manager.

RDS y Lambda se ejecutan dentro de subredes privadas. El endpoint `GET /health` es público para verificación de disponibilidad; los endpoints CRUD requieren autenticación con un ID token válido de Amazon Cognito.

Servicios publicados:

- API: `https://z3f3qeolh7.execute-api.mx-central-1.amazonaws.com/prod`
- Web: `http://crud-personas-web-397572991247.s3-website.mx-central-1.amazonaws.com`

## Tecnologías principales

- Node.js 22
- Express
- AWS Lambda
- API Gateway
- Amazon Cognito
- Amazon RDS MySQL
- AWS Secrets Manager
- AWS SAM / CloudFormation
- React
- Next.js
- Postman
- GitHub Actions

## Requisitos previos

Para ejecutar y desplegar el proyecto se requiere:

- Node.js 22 o superior
- npm
- Git
- MySQL local, solo si se desea ejecutar la API contra una base local
- AWS CLI configurado
- AWS SAM CLI instalado
- Una cuenta de AWS con permisos para crear recursos de CloudFormation, IAM, VPC, Lambda, API Gateway, Cognito, Secrets Manager y RDS

## API

| Método | Ruta | Descripción | Autenticación |
|---|---|---|---|
| GET | `/health` | Verificar estado del servicio | No |
| POST | `/api/personas` | Crear registro | Sí |
| GET | `/api/personas` | Listar registros | Sí |
| GET | `/api/personas/:id` | Consultar registro por ID | Sí |
| PUT | `/api/personas/:id` | Actualizar registro completo | Sí |
| PATCH | `/api/personas/:id` | Actualizar registro parcial | Sí |
| DELETE | `/api/personas/:id` | Eliminar registro | Sí |

Ejemplo de cuerpo JSON:

```json
{
  "nombreCompleto": "María López García",
  "rfc": "LOGM900101AB1",
  "correoElectronico": "maria@example.com",
  "codigoPostal": "03100"
}
```

## Validaciones

El backend valida:

- campos obligatorios;
- formato de RFC;
- formato de correo electrónico;
- código postal mexicano de 5 dígitos;
- unicidad de RFC y correo electrónico en MySQL.

Las respuestas de error también se devuelven en formato JSON.

## Instalación local

Instalar dependencias:

```bash
npm install
```

Ejecutar pruebas:

```bash
npm test
```

Las pruebas HTTP usan un repositorio en memoria, por lo que no requieren una instalación local de MySQL.

## Ejecución local con MySQL

Para ejecutar la API localmente contra MySQL:

```powershell
Copy-Item .env.example .env
```

Después se deben configurar las variables `DB_*` dentro del archivo `.env` con los datos de conexión de una base MySQL local.

Ejecutar la API:

```bash
npm start
```

La aplicación crea automáticamente la tabla `personas` si no existe.

## Despliegue del backend en AWS

Validar y construir la aplicación con AWS SAM:

```bash
sam validate --lint
sam build
```

Desplegar:

```bash
sam deploy --guided
```

Valores recomendados para el primer despliegue:

- región: `mx-central-1`
- stack name: `crud-personas-prod`
- capabilities: `CAPABILITY_IAM`
- guardar configuración: `yes`

Al finalizar el despliegue, consultar los outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name crud-personas-prod \
  --region mx-central-1 \
  --query "Stacks[0].Outputs"
```

Los outputs principales son:

- `ApiUrl`: URL pública del API Gateway;
- `UserPoolId`: identificador del User Pool de Cognito;
- `UserPoolClientId`: identificador del cliente de Cognito.

> Nota: el despliegue crea recursos de AWS que pueden generar costo, especialmente Amazon RDS. Si el ambiente ya no se necesita, se recomienda eliminar el stack desde CloudFormation.

## Crear usuario de Cognito

Usar el `UserPoolId` generado por el despliegue:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id ID_DEL_POOL \
  --username evaluador@ejemplo.com \
  --user-attributes Name=email,Value=evaluador@ejemplo.com Name=email_verified,Value=true \
  --region mx-central-1
```

Asignar contraseña permanente:

```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id ID_DEL_POOL \
  --username evaluador@ejemplo.com \
  --password "UnaClave-Segura1!" \
  --permanent \
  --region mx-central-1
```

Ese usuario puede utilizarse para iniciar sesión desde la interfaz web y obtener un ID token válido para Postman.

## Pruebas con Postman

El repositorio incluye la colección:

```text
postman/CRUD-Personas.postman_collection.json
```

Pasos sugeridos:

1. Importar la colección en Postman.
2. Configurar la variable `baseUrl` con el output `ApiUrl`.
3. Configurar la variable `idToken` con un ID token válido de Cognito.
4. Ejecutar las peticiones CRUD.

La colección usa Bearer Auth con `{{idToken}}`. Al crear un registro, la colección guarda automáticamente el ID para reutilizarlo en las peticiones de consulta, actualización y eliminación.

## Interfaz web con Next.js

La interfaz se encuentra en la carpeta `web`.

Configurar variables de entorno:

```bash
cd web
cp .env.local.example .env.local
```

En Windows PowerShell:

```powershell
cd web
Copy-Item .env.local.example .env.local
```

Completar los valores:

```text
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_CLIENT_ID=
```

Ejecutar en desarrollo:

```bash
npm install
npm run dev
```

## Publicación del frontend en Amazon S3

La aplicación usa la exportación estática de Next.js configurada en
`web/next.config.mjs`. Antes de compilar, definir:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `NEXT_PUBLIC_COGNITO_CLIENT_ID`

Después, ejecutar `npm run build` dentro de `web` y publicar el contenido de
`web/out` en un bucket S3 configurado para alojamiento web.

## GitHub Actions

El repositorio incluye workflows en `.github/workflows`:

- `ci.yml`: instala dependencias, ejecuta pruebas del backend y compila la interfaz Next.js.
- `deploy.yml`: despliega el backend con AWS SAM, compila Next.js y sincroniza
  la exportación web con Amazon S3.

El workflow de despliegue usa OIDC para evitar llaves permanentes de AWS en GitHub. Para habilitarlo se debe configurar previamente:

1. un proveedor OIDC de GitHub en AWS IAM;
2. un rol IAM con permisos de despliegue;
3. el secreto `AWS_DEPLOY_ROLE_ARN` en el environment `production` de GitHub.

Después de configurar el rol y el secreto, el despliegue puede ejecutarse manualmente desde GitHub Actions o mediante push a `main`.
