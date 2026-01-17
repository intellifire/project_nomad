# Agency Configuration Template

This template provides a starting point for your agency's Project Nomad configuration.

## Setup Instructions

### 1. Copy This Template

```bash
cp -r configuration/template nomad-config-{your-agency-id}
cd nomad-config-{your-agency-id}
git init
```

### 2. Update config.json

Replace all placeholder values:

| Placeholder | Replace With |
|-------------|--------------|
| `CHANGE_ME` | Your agency ID (lowercase, hyphens OK) |
| `Your Agency Name` | Display name for your agency |
| `https://login.your-agency.gov` | Your OIDC issuer URL |
| `nomad-client` | Your OAuth client ID |
| Role mappings | Your agency's role names |
| Data source URLs | Your GIS service endpoints |
| Colors | Your agency's brand colors |

### 3. Add Your Logo

Place your agency logo in the `assets/` folder:

- **Filename**: `logo.png` (or update `logoUrl` in config)
- **Format**: PNG with transparency recommended
- **Size**: 200x50px recommended (will be scaled)
- **Location**: Dark backgrounds - use light/white logo

Update the `branding.logoUrl` path:
```json
"logoUrl": "/configuration/{your-agency-id}/assets/logo.png"
```

### 4. Configure Authentication

#### For OIDC (Azure AD, Okta, etc.)

```json
"auth": {
  "provider": "oidc",
  "oidc": {
    "issuer": "https://login.microsoftonline.com/{tenant-id}/v2.0",
    "clientId": "{your-client-id}",
    "scopes": ["openid", "profile", "email"]
  }
}
```

Store `clientSecret` in environment variable `NOMAD_OIDC_CLIENT_SECRET`.

#### For SAML

```json
"auth": {
  "provider": "saml",
  "saml": {
    "idpMetadataUrl": "https://idp.your-agency.gov/metadata.xml",
    "spEntityId": "nomad-sp",
    "acsUrl": "https://nomad.your-agency.gov/auth/saml/callback"
  }
}
```

### 5. Map Your Roles

Map your agency's external roles to Nomad's internal roles:

```json
"roleMappings": [
  { "externalRole": "YOUR_ADMIN_GROUP", "internalRole": "admin" },
  { "externalRole": "YOUR_ANALYST_GROUP", "internalRole": "fban" },
  { "externalRole": "YOUR_STAFF_GROUP", "internalRole": "modeler" },
  { "externalRole": "YOUR_VIEWER_GROUP", "internalRole": "user" }
]
```

### 6. Configure Data Sources

Update URLs to point to your agency's services:

- **Weather**: REST API or WFS for weather station data
- **Wildfire Points**: WFS for hotspot/fire point data
- **Fuel Types**: WCS for fuel grid raster data

### 7. Commit and Push

```bash
git add .
git commit -m "Initial agency configuration"
git remote add origin git@github.com:your-org/nomad-config-{your-agency-id}.git
git push -u origin main
```

### 8. Add to Project Nomad

From the Project Nomad repository root:

```bash
git submodule add git@github.com:your-org/nomad-config-{your-agency-id}.git configuration/{your-agency-id}
```

## File Structure

```
nomad-config-{agency-id}/
  config.json      # Main configuration file
  assets/
    logo.png       # Agency logo
  README.md        # This file (optional to keep)
```

## Environment Variables

Set these in your deployment:

```bash
NOMAD_AGENCY_ID="{your-agency-id}"
NOMAD_DEPLOYMENT_MODE="ACN"
NOMAD_OIDC_CLIENT_SECRET="{secret}"  # If using OIDC
```

## Validation

Test your configuration by starting Nomad in development mode:

```bash
NOMAD_AGENCY_ID="{your-agency-id}" npm run dev
```

Check console for schema validation warnings.

## Need Help?

See the main configuration documentation at `/configuration/README.md` for complete schema reference and advanced options.
