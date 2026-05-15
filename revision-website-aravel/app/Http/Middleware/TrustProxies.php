<?php

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\TrustProxies as Middleware;

class TrustProxies extends Middleware
{
    /**
     * Trust the current reverse proxy so tunnel/HTTPS headers keep generated URLs valid.
     *
     * @var array<int, string>|string|null
     */
    protected $proxies = '*';
}
