FROM python:3.11-slim

# Set environment variables to force unbuffered output (logs appear immediately)
ENV PYTHONUNBUFFERED=1
#

# 3. SET UP PROJECT ENVIRONMENT
# Set the working directory
WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application files
COPY *.py /app/
COPY *.sh /app/

# 5. EXPOSE PORT AND RUN THE APPLICATION
# Expose the port the app runs on
EXPOSE 5000
# Run the application
CMD ["python", "/app/src/services.py"]
