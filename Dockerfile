# Use the official .NET SDK image (includes dotnet-script)
FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build-env

# Install Node.js
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g npm

# Set working directory
WORKDIR /app

# Copy everything
COPY . .

# Install node dependencies
RUN npm install

# Expose the port your app runs on
EXPOSE 8080

# Start the Node.js server
CMD ["node", "server.js"]