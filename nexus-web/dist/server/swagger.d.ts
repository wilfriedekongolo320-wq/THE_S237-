/**
 * Swagger / OpenAPI 3.0 documentation
 * Available at /api/docs
 */
export declare const swaggerSpec: {
    openapi: string;
    info: {
        title: string;
        version: string;
        description: string;
        contact: {
            name: string;
            url: string;
        };
    };
    servers: {
        url: string;
        description: string;
    }[];
    components: {
        securitySchemes: {
            BearerAuth: {
                type: string;
                scheme: string;
                bearerFormat: string;
            };
        };
        schemas: {
            Client: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        format: string;
                    };
                    username: {
                        type: string;
                    };
                    protocol: {
                        type: string;
                        enum: string[];
                    };
                    status: {
                        type: string;
                        enum: string[];
                    };
                    expires_at: {
                        type: string;
                        format: string;
                    };
                    data_limit: {
                        type: string;
                        nullable: boolean;
                    };
                    data_used: {
                        type: string;
                    };
                    created_at: {
                        type: string;
                        format: string;
                    };
                };
            };
            Plan: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        format: string;
                    };
                    name: {
                        type: string;
                    };
                    protocol: {
                        type: string;
                    };
                    duration_days: {
                        type: string;
                    };
                    price: {
                        type: string;
                    };
                    currency: {
                        type: string;
                        default: string;
                    };
                };
            };
            Payment: {
                type: string;
                properties: {
                    payment_id: {
                        type: string;
                        format: string;
                    };
                    reference: {
                        type: string;
                    };
                    campay_reference: {
                        type: string;
                    };
                    ussd_code: {
                        type: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                    };
                };
            };
            SystemStats: {
                type: string;
                properties: {
                    cpu: {
                        type: string;
                        description: string;
                    };
                    memory: {
                        type: string;
                        properties: {
                            total: {
                                type: string;
                            };
                            used: {
                                type: string;
                            };
                            percent: {
                                type: string;
                            };
                        };
                    };
                    disk: {
                        type: string;
                        properties: {
                            total: {
                                type: string;
                            };
                            used: {
                                type: string;
                            };
                            percent: {
                                type: string;
                            };
                        };
                    };
                    uptime_seconds: {
                        type: string;
                    };
                    timestamp: {
                        type: string;
                        format: string;
                    };
                };
            };
        };
    };
    security: {
        BearerAuth: never[];
    }[];
    paths: {
        '/auth/login': {
            post: {
                tags: string[];
                summary: string;
                security: never[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    username: {
                                        type: string;
                                    };
                                    password: {
                                        type: string;
                                    };
                                };
                                required: string[];
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        token: {
                                            type: string;
                                        };
                                        role: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '401': {
                        description: string;
                    };
                };
            };
        };
        '/clients': {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    items: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                    };
                };
            };
            post: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    username: {
                                        type: string;
                                    };
                                    protocol: {
                                        type: string;
                                    };
                                    expires_at: {
                                        type: string;
                                        format: string;
                                    };
                                };
                                required: string[];
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/clients/{id}': {
            delete: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/monitoring/snapshot': {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/monitoring/stream': {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/payment/initiate': {
            post: {
                tags: string[];
                summary: string;
                security: never[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    phone: {
                                        type: string;
                                        example: string;
                                    };
                                    amount: {
                                        type: string;
                                        example: number;
                                    };
                                    plan_id: {
                                        type: string;
                                        format: string;
                                    };
                                };
                                required: string[];
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/payment/status/{reference}': {
            get: {
                tags: string[];
                summary: string;
                security: never[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/qrcode/{clientId}': {
            get: {
                tags: string[];
                summary: string;
                parameters: ({
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        enum?: undefined;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        enum: string[];
                    };
                    required?: undefined;
                })[];
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/export/clients/csv': {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/servers': {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
            post: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                    };
                                    host: {
                                        type: string;
                                    };
                                    port: {
                                        type: string;
                                    };
                                    ssh_user: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                    };
                };
            };
        };
    };
    tags: {
        name: string;
        description: string;
    }[];
};
//# sourceMappingURL=swagger.d.ts.map