# 🚀 KubeMon

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Compatible-green.svg)](https://kubernetes.io/)

**KubeMon**, birden fazla Kubernetes cluster'ını merkezi olarak izlemenizi ve pod durumlarını gerçek zamanlı olarak görselleştirmenizi sağlayan açık kaynak kodlu bir monitoring uygulamasıdır.

## ✨ Özellikler

- 🔄 **Multi-Cluster Monitoring**: Birden fazla Kubernetes cluster'ını tek bir arayüzden izleyin
- 🎨 **Modern Arayüz**: Kullanıcı dostu ve responsive web arayüzü
- 🐳 **Docker Desteği**: Tek komutla kolay kurulum ve çalıştırma
- 🔒 **Güvenli**: Kubeconfig dosyalarınız yerel olarak saklanır
- ⚡ **Hızlı**: Optimized backend API ile yüksek performans

## 🛠️ Teknolojiler

**Frontend:**
- React.js
- Modern JavaScript/TypeScript
- Responsive CSS

**Backend:**
- Python/Node.js API
- Kubernetes API entegrasyonu
- Real-time data processing

**Infrastructure:**
- Docker & Docker Compose
- Kubernetes API clients

## 📋 Gereksinimler

- Docker ve Docker Compose
- Geçerli Kubernetes cluster erişimi
- Kubeconfig dosyaları (admin yetkili)

## 🚀 Hızlı Başlangıç

### 1. Projeyi İndirin

```bash
git clone https://github.com/[username]/KubeMon.git
cd KubeMon
```

### 2. Kubeconfig Dosyalarını Ekleyin

```bash
# clusters/ klasörünü oluşturun (yoksa)
mkdir -p clusters/

# Kubeconfig dosyalarınızı kopyalayın
cp /path/to/your/admin-cluster1.conf clusters/
cp /path/to/your/admin-cluster2.conf clusters/
```

⚠️ **Güvenlik Uyarısı**: Kubeconfig dosyalarınızı asla git repository'sine commit etmeyin!

### 3. Uygulamayı Başlatın

```bash
# Tüm servisleri build edin ve başlatın
docker-compose up --build

# Arka planda çalıştırmak için
docker-compose up --build -d
```

### 4. Uygulamayı Açın

Uygulama başarıyla başladıktan sonra:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## 📄 Lisans

Bu proje [MIT License](LICENSE) altında lisanslanmıştır.
