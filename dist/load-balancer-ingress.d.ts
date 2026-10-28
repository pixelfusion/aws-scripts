import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
/**
 * Who may connect to the load balancer listeners (HTTP 80 and HTTPS 443).
 *
 * - `Open`: no IP restriction. This is the default and matches previous behaviour.
 * - `Cloudflare`: only Cloudflare's published IPv4 and IPv6 ranges.
 * - `Cidr`: only the ranges passed in `loadBalancerCidrs`.
 */
export declare const LOAD_BALANCER_INGRESS: {
    readonly Open: "open";
    readonly Cloudflare: "cloudflare";
    readonly Cidr: "cidr";
};
export type LoadBalancerIngress = (typeof LOAD_BALANCER_INGRESS)[keyof typeof LOAD_BALANCER_INGRESS];
export declare function resolveLoadBalancerCidrs(ingress: LoadBalancerIngress, cidrs: string[] | undefined): string[] | undefined;
/**
 * Allow `cidrs` to reach the load balancer on `ports`, and nothing else.
 * The listeners must be created with `openListener: false` so the default
 * 0.0.0.0/0 rule is not added.
 *
 * Rules are split across extra security groups when one group cannot hold them.
 */
export declare function restrictLoadBalancerIngress(scope: Construct, loadBalancer: elb.ApplicationLoadBalancer, vpc: ec2.IVpc, cidrs: string[], ports: number[]): void;
