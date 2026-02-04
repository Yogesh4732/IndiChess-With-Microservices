# Build stage
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN mvn -q -DskipTests package

# Runtime stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

# internal-communication-service (Eureka server) runs on 8761
EXPOSE 8761

ENTRYPOINT ["java","-jar","/app/app.jar"]
