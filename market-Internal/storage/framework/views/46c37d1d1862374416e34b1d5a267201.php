<!doctype html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="<?php echo e(csrf_token()); ?>">
    <meta name="description" content="Marketplace internal perusahaan untuk produk, layanan, cart, checkout guest, dan pelacakan order.">
    <title><?php echo e(config('app.name', 'KishaMarket Internal')); ?></title>
    <?php echo app('Illuminate\Foundation\Vite')->reactRefresh(); ?>
    <?php echo app('Illuminate\Foundation\Vite')(['resources/css/app.css', 'resources/js/marketplace/main.jsx']); ?>
</head>
<body>
    <div id="root">
        <div style="min-height:100vh;display:grid;place-items:center;background:#f5f7f6;font-family:Arial,sans-serif;color:#334155">
            <div style="text-align:center">
                <strong style="display:block;font-size:20px;color:#0f172a">Memuat marketplace...</strong>
                <span style="display:block;margin-top:8px;font-size:13px">Pastikan Laravel dan Vite sedang berjalan.</span>
            </div>
        </div>
    </div>
    <noscript>Aktifkan JavaScript untuk menjalankan marketplace internal.</noscript>
</body>
</html>
<?php /**PATH C:\Users\Kisha AMS\Downloads\kishamarket-full-laravel-react-js-fixed\kishamarket-full-js-final\resources\views/app.blade.php ENDPATH**/ ?>