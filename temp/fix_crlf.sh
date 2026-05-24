#!/bin/bash
perl -pi -e 's/\r$//' /home/nathan/ocr-kb-matcher/frontend/components/navigation/Navigation.tsx
echo "perl_EXIT:$?"
