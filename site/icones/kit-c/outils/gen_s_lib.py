# Génère le S de Serein coupé dans l'épine (courbes d'origine conservées, de Casteljau)
import sys
def split(p, t):
    (x0,y0),(x1,y1),(x2,y2),(x3,y3) = p
    L=lambda a,b:(a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t)
    a,b,c = L(p[0],p[1]),L(p[1],p[2]),L(p[2],p[3]); d,e = L(a,b),L(b,c); f=L(d,e)
    return [p[0],a,d,f],[f,e,c,p[3]]
c1=[(308,158),(308,158),(242,142),(210,178)]
c2=[(210,178),(178,214),(206,240),(244,252)]
c3=[(244,252),(282,264),(312,284),(306,322)]
c4=[(306,322),(300,358),(228,370),(196,362)]
def fmt(c): return "C %.1f %.1f %.1f %.1f %.1f %.1f" % (*c[1],*c[2],*c[3])
def paths(t1,t2):
    up,_ = split(c2,t1); _,lo = split(c3,t2)
    top = "M 308 158 %s %s" % (fmt(c1), fmt(up))
    bot = "M %.1f %.1f %s %s" % (*lo[0], fmt(lo), fmt(c4))
    return top, bot
