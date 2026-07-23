<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ProductMediaService
{
    public function prepare(
        array $existingPaths,
        array $keptPaths,
        array $files
    ): array {
        $existing = collect($existingPaths)
            ->map(fn ($path) => $this->normalizePath($path))
            ->filter()
            ->unique()
            ->values();

        $kept = collect($keptPaths)
            ->map(fn ($path) => $this->normalizePath($path))
            ->filter(fn ($path) => $existing->contains($path))
            ->unique()
            ->values();

        $stored = collect($files)
            ->filter(fn ($file) => $file instanceof UploadedFile)
            ->map(function (UploadedFile $file): string {
                return $file->store('products', 'public');
            })
            ->filter()
            ->values();

        return [
            'paths' => $kept
                ->concat($stored)
                ->unique()
                ->values()
                ->all(),
            'new_paths' => $stored->all(),
            'removed_paths' => $existing
                ->diff($kept)
                ->values()
                ->all(),
        ];
    }

    public function deleteMany(array $paths): void
    {
        collect($paths)
            ->map(fn ($path) => $this->normalizePath($path))
            ->filter()
            ->each(function (string $path): void {
                Storage::disk('public')->delete($path);
            });
    }

    private function normalizePath(mixed $path): ?string
    {
        if (is_array($path)) {
            $path = $path['path']
                ?? $path['url']
                ?? null;
        }

        if (! is_string($path)) {
            return null;
        }

        $path = trim(str_replace('\\', '/', $path));

        if (
            $path === ''
            || str_starts_with($path, 'http://')
            || str_starts_with($path, 'https://')
        ) {
            return null;
        }

        $path = ltrim($path, '/');

        foreach ([
            'storage/app/public/',
            'public/storage/',
            'storage/',
        ] as $prefix) {
            if (str_starts_with($path, $prefix)) {
                $path = substr($path, strlen($prefix));
                break;
            }
        }

        return filled($path) ? $path : null;
    }
}