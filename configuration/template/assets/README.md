# Agency Assets

Place your agency branding assets in this folder.

## Logo Requirements

**Filename**: `logo.png`

**Specifications**:
- Format: PNG (transparency supported)
- Dimensions: 200x50px recommended
- Max file size: 50KB
- Background: Transparent (logo displays on dark header)

**Tips**:
- Use a horizontal/landscape orientation
- White or light-colored logos work best on dark backgrounds
- Avoid fine details that won't scale well

## Updating the Logo

After adding your logo, update `config.json`:

```json
"branding": {
  "logoUrl": "/configuration/{your-agency-id}/assets/logo.png"
}
```

## Other Assets

You may add additional assets here (favicon, etc.) as needed for your deployment.
