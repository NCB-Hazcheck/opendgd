# OpenDGD: one image that serves the website and the render API.
# The render API fills the IMO Multimodal Dangerous Goods Form from an OpenDGD
# document (DOCX) and, via an external LibreOffice unoserver, returns PDF.

# --- build the static site ---
FROM node:22-slim AS site
WORKDIR /app
COPY site/package.json site/package-lock.json ./site/
RUN cd site && npm ci
COPY site/ ./site/
COPY spec/ ./spec/
COPY examples/ ./examples/
RUN cd site && npm run build

# --- render service + site ---
FROM node:22-slim
WORKDIR /app
COPY tools/render-dgd/package.json tools/render-dgd/package-lock.json ./tools/render-dgd/
RUN cd tools/render-dgd && npm ci --omit=dev
COPY spec/ ./spec/
COPY tools/render-dgd/ ./tools/render-dgd/
COPY --from=site /app/site/dist ./site/dist

WORKDIR /app/tools/render-dgd
ENV PORT=8080 \
    UNOSERVER_URL=http://unoserver-service:3000 \
    SITE_DIR=/app/site/dist
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
