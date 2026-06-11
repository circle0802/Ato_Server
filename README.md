# Ato_Server

## Environment

Gift recommendations use Anthropic to generate gift ideas, then resolve each idea to a real Naver Shopping product.

Required environment variables:

- `ANTHROPIC_API_KEY`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `TOKEN_SECRET`

Optional:

- `HOST` default `127.0.0.1`
- `PORT` default `3000`
- `DATA_DIR` default `data`

## Naver Shopping Search

Create a Naver Developers application with Search API access enabled, then copy the issued credentials into `.env`:

```env
NAVER_CLIENT_ID=your-client-id
NAVER_CLIENT_SECRET=your-client-secret
```

The server calls `GET https://openapi.naver.com/v1/search/shop.json` with the headers `X-Naver-Client-Id` and `X-Naver-Client-Secret`. It uses the shopping result's `title`, `link`, `image`, and `lprice` for the gift response.
