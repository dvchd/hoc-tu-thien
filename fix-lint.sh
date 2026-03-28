#!/bin/bash
# Revert messy edit and do it clean
git checkout src/presentation/components/activation/ActivationQRPanel.tsx

# Find and replace <img with eslint disable comment
sed -i 's/<img/{\/\* eslint-disable-next-line @next\/next\/no-img-element \*\/}\n<img/g' src/presentation/components/activation/ActivationQRPanel.tsx
sed -i 's/<img/{\/\* eslint-disable-next-line @next\/next\/no-img-element \*\/}\n<img/g' src/presentation/components/layout/Sidebar.tsx
sed -i 's/<img/{\/\* eslint-disable-next-line @next\/next\/no-img-element \*\/}\n<img/g' src/presentation/components/layout/TopBar.tsx
sed -i 's/<img/{\/\* eslint-disable-next-line @next\/next\/no-img-element \*\/}\n<img/g' src/presentation/components/mentor/MentorPublicProfile.tsx
sed -i 's/<img/{\/\* eslint-disable-next-line @next\/next\/no-img-element \*\/}\n<img/g' src/presentation/components/settings/SettingsForm.tsx

# Fix AdminReportsTable.tsx useEffect warning
sed -i 's/}, \[filterStatus\]);/}, \[filterStatus, fetchReports\]);/g' src/presentation/components/admin/AdminReportsTable.tsx
