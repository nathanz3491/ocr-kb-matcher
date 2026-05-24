#!/bin/bash
curl -s http://localhost:3001/api/auth/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher_final@test.com","password":"testpass123","name":"Final Teacher","accountType":"teacher"}'
echo ""
echo "Status check:"
curl -s http://localhost:3001/health
