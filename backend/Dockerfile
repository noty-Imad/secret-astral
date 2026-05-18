# Stage 1: Build the JAR with JDK 17
FROM eclipse-temurin:17-jdk-focal AS builder

WORKDIR /app
COPY . .

RUN chmod +x ./gradlew && ./gradlew jar --no-daemon

# Stage 2: Run with JRE 17
FROM ibm-semeru-runtimes:open-17-jre-focal

ENV PORT 8080
EXPOSE 8080

COPY --from=builder /app/build/libs/*.jar /secret-hitler-online.jar

CMD java -jar /secret-hitler-online.jar
