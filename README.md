# CRUD de personas en AWS

Aplicación full-stack protegida con Amazon Cognito. El backend usa Node.js 22,
Express, AWS Lambda, API Gateway y RDS MySQL; la interfaz usa React con Next.js.
Toda la infraestructura se define en `template.yaml` con AWS SAM y se despliega
en la región de México (`mx-central-1`). No requiere Docker.

## Arquitectura

```text
Next.js (AWS Amplify) → Cognito → API Gateway → Lambda → RDS Proxy → RDS MySQL
```

RDS y Lambda permanecen en subredes privadas. Las credenciales se generan en
Secrets Manager y nunca se guardan en Git. `GET /health` es público; todo el
CRUD requiere un ID token válido de Cognito.

## API

| Método | Ruta | Acción |
|---|---|---|
| POST | `/api/personas` | Crear |
| GET | `/api/personas` | Listar |
| GET | `/api/personas/:id` | Consultar |
| PUT/PATCH | `/api/personas/:id` | Actualizar |
| DELETE | `/api/personas/:id` | Eliminar |

```json
{
  "nombreCompleto": "María López García",
  "rfc": "LOGM900101AB1",
  "correoElectronico": "maria@example.com",
  "codigoPostal": "03100"
}
```

RFC, correo, campos obligatorios y código postal se validan en el backend. RFC
y correo son únicos en MySQL.

## Pruebas locales sin Docker

Las pruebas HTTP usan un repositorio en memoria, por lo que no requieren MySQL:

```bash
npm install
npm test
```

Para ejecutar la API contra una instalación local de MySQL:

```powershell
Copy-Item .env.example .env
npm start
```

Configure primero las variables `DB_*` de `.env`. La tabla se crea al arrancar.

## Despliegue del backend en AWS

Requisitos: AWS CLI y AWS SAM CLI configurados con una cuenta que pueda crear
CloudFormation, IAM, VPC, Lambda, API Gateway, Cognito, Secrets Manager y RDS.

```bash
sam validate --lint
sam build
sam deploy --guided
```

En el primer despliegue conserve `mx-central-1`, el stack
`crud-personas-prod` y guarde la configuración. Crear RDS y RDS Proxy genera
cargos; elimine el stack al terminar la evaluación si ya no lo necesita.

Al finalizar, consulte los outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name crud-personas-prod \
  --region mx-central-1 \
  --query "Stacks[0].Outputs"
```

## Crear el primer usuario privado

Cognito no expone registro público. Use el `UserPoolId` mostrado en los outputs:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id ID_DEL_POOL \
  --username evaluador@ejemplo.com \
  --user-attributes Name=email,Value=evaluador@ejemplo.com Name=email_verified,Value=true \
  --region mx-central-1

aws cognito-idp admin-set-user-password \
  --user-pool-id ID_DEL_POOL \
  --username evaluador@ejemplo.com \
  --password "UnaClave-Segura1!" \
  --permanent \
  --region mx-central-1
```

## Postman

Importe `postman/CRUD-Personas.postman_collection.json`, cambie `baseUrl` por el
output `ApiUrl` y pegue un ID token de Cognito en `idToken`. Ejecute las
peticiones en orden; la colección guarda el ID del registro creado.

## Interfaz Next.js y Amplify

Copie `web/.env.local.example` a `web/.env.local` y reemplace sus tres valores
con los outputs de SAM:

```bash
cd web
npm install
npm run dev
```

Para publicar, conecte este repositorio a AWS Amplify Hosting, seleccione la
rama `main` y agregue `NEXT_PUBLIC_API_URL`,
`NEXT_PUBLIC_COGNITO_USER_POOL_ID` y `NEXT_PUBLIC_COGNITO_CLIENT_ID` como
variables de entorno. Amplify detectará `amplify.yml`.

## GitHub Actions

`CI` prueba API y compila Next.js. `Deploy AWS` usa OIDC, sin llaves AWS
permanentes. En el environment `production` de GitHub agregue el secreto
`AWS_DEPLOY_ROLE_ARN`, apuntando a un rol que confíe en el proveedor OIDC de
GitHub y tenga permisos de despliegue. Después ejecute manualmente el workflow
o haga push a `main`.
