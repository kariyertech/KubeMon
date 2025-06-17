# KubeMon

KubeMon, birden fazla Kubernetes cluster'ını izlemek ve pod durumlarını görselleştirmek için geliştirilmiş açık kaynak bir monitoring uygulamasıdır.

## Kurulum

### 1. Repoyu klonlayın
```sh
git clone <repo-url>
cd KubeMon
```

### 2. Docker Compose ile başlatın
```sh
docker-compose up --build
```
Bu komut hem frontend hem backend servislerini başlatır. Varsayılan olarak:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### 3. Kendi kubeconfig dosyalarınızı ekleyin
`clusters/` klasörüne kendi admin-*.conf dosyalarınızı ekleyin. (Bu dosyaları paylaşmayın!)

## Lisans
MIT License (GitHub üzerinden seçilecek)

---

> Hassas dosyalar (kubeconfig, .db, .env) repoya eklenmemelidir. Detaylar için .gitignore ve klasör README dosyalarına bakınız.
