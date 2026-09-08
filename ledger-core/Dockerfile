# Build and run the Spring Boot ledger service on a Java 21 runtime.
FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /workspace
COPY pom.xml .
RUN mvn --batch-mode --no-transfer-progress dependency:go-offline
COPY src ./src
RUN mvn --batch-mode --no-transfer-progress -DskipTests package

FROM eclipse-temurin:21-jre-jammy

RUN useradd --system --create-home --uid 10001 tradepulse
WORKDIR /app
COPY --from=build /workspace/target/ledger-core-0.1.0-SNAPSHOT.jar /app/ledger-core.jar
USER tradepulse

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/ledger-core.jar"]
