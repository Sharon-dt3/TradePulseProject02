# Compile a static gateway binary and run it from a minimal non-root image.
FROM golang:1.23-bookworm AS build

WORKDIR /workspace
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /gateway ./main.go

FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /gateway /gateway
EXPOSE 8081
USER nonroot:nonroot
ENTRYPOINT ["/gateway"]
