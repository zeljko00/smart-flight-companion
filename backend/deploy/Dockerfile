FROM mcr.microsoft.com/dotnet/sdk:10.0

# Install EF CLI tool globally in the image
RUN dotnet tool install --global dotnet-ef --version 10.*

# Make global tools available in all shells and CMD
ENV PATH="${PATH}:/root/.dotnet/tools"

WORKDIR /app

CMD ["dotnet", "watch", "run", \
     "--project", "src/web-services.Api/web-services.Api.csproj",  \
     "--no-launch-profile"]