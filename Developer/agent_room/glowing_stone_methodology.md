# 빛나는 돌 구현 방법론 — 실제 제작 도구, 형상, 표면 광택, 인터랙티브 뷰어

## 1. 먼저 정확한 답

이번 빛나는 돌의 원본 PNG/MP4는 **3ds Max나 Blender로 모델링하지 않았다.** Python 코드로 입체 형상을 정의하고, 화면의 픽셀별 표면 위치와 방향을 계산해 직접 렌더링했다. 이를 **절차적 모델링 + 소프트웨어 렌더링**이라고 한다. 절차적이라는 말은 마우스로 꼭짓점을 하나씩 편집하는 대신 규칙과 수식으로 형태를 만든다는 뜻이다.

이번 추가 작업에서는 동일한 돌 형상을 실제 삼각형 메시로 재구성하고, 광택 계산을 Three.js/GLSL에 옮겨 마우스로 돌려 보는 실시간 페이지를 만들었다. 원본 시안과 실시간 뷰어는 같은 형상·핵심 광택 수식을 공유하지만, 조명·샘플링·블룸 결과는 픽셀 단위로 같다고 주장하지 않는다.

씰온라인의 제작 도구가 3ds Max였다는 이야기와 **이번 돌의 제작 도구**는 별개다. 씰온라인 원본 모델·텍스처·셰이더를 추출한 결과가 아니며, AI 이미지 생성기로 만든 이미지도 아니다.

## 2. 사용한 도구와 실제 역할

- **Python:** 원본 시안 제작 프로그램과 프레임 생성 실행.
- **NumPy:** 38개 평면, 난수, 표면 위치, 법선, 반사 방향, 색상과 광택을 배열 단위로 계산.
- **Pillow:** 계산 결과를 PNG로 저장, 발광 부분 Gaussian Blur, 한글 라벨 및 비교 이미지 작성.
- **OpenCV:** 프레임을 MP4로 기록하고 다시 디코딩해 확인. 원본은 mp4v 코덱, 720×540, 24fps, 120프레임.
- **Three.js:** 브라우저에서 삼각형 메시를 GPU로 표시.
- **GLSL / ShaderMaterial:** 돌의 회색 재질과 표면에 흐르는 광택을 실시간 계산.
- **OrbitControls:** 마우스·터치 시점 회전, 확대/축소, 화면 이동.
- **Playwright + 설치된 Chrome:** 실제 HTML 로딩과 조작 검증. 제작 도구가 아니라 검증 도구.

3ds Max, Blender, 외부 텍스처 이미지, GLB 모델, 이미지 생성 API는 이번 제작에 사용하지 않았다.

## 3. 돌 형태를 만드는 방법: 여러 평면으로 깎인 입체

돌은 완전한 구가 아니라 모서리와 넓은 면이 있는 볼록한 다면체다.

1. 구 주변에 비교적 균일한 방향 38개를 만든다. 방향 배치에는 Fibonacci sphere 계열의 각도 분포를 사용한다.
2. 가로·세로·깊이 비율을 `1.13`, `0.94`, `0.87`로 조정한다.
3. 각 방향에 평면을 두고, 중심과의 거리를 `0.92 ± 0.075` 범위로 흔든다.
4. NumPy `default_rng(31)`을 사용해 같은 코드를 실행하면 같은 난수와 돌 형태가 나오도록 한다.
5. 모든 평면의 안쪽 영역을 동시에 만족하는 공간만 남긴다.

평면 조건은 다음과 같다.

```text
n_i · p <= d_i
n_i: i번째 평면의 방향 계수
p: 입체 공간의 점
 d_i: 평면의 중심 거리 계수
```

비유하면 둥근 돌을 여러 방향에서 칼로 조금씩 깎고 남은 덩어리다. 랜덤한 돌이지만 재현 가능한 고정 시드를 사용한다.

원본 Python 렌더러는 일반 모델 파일이나 삼각형 메시를 만들지 않았다. 카메라 방향으로 각 픽셀이 이 다면체와 만나는 위치를 계산해서 그렸다. 따라서 처음 만든 PNG/MP4를 그 자체로 GLB라고 부르면 틀리다.

실시간 뷰어에서는 평면 3개의 교차점을 구하고, 나머지 평면의 안쪽에 있는 점만 채택했다. 각 평면 위의 꼭짓점을 순서대로 정렬한 후 삼각형으로 나눴다. 현재 결과는 **고유 꼭짓점 72개, 다각형 면 38개, 삼각형 140개**다. GPU BufferGeometry에는 삼각형별 위치와 원래 평면 방향을 저장한다.

## 4. 돌의 기본 재질

광택을 꺼도 자연스러운 돌처럼 보여야 하므로 바탕부터 만든다.

- 기본 색은 회청색 `(0.29, 0.32, 0.36)`.
- 표면 방향과 빛 방향의 내적 `max(dot(N,L),0)`으로 기본 명암을 만든다.
- 위치에 따른 높은 주파수의 사인함수 곱으로 잔잔한 돌 입자를 만든다.
- 낮은 주파수의 사인함수로 넓은 얼룩을 더한다.

텍스처 PNG를 읽는 방식이 아니라, 표면 위치마다 함수를 계산해 재질을 만드는 **절차적 텍스처**다. 이를 이미지로 베이크하는 단계는 수행하지 않았다.

## 5. 법선: 돌 표면이 향하는 방향

법선은 표면이 어느 방향을 보고 있는지 나타내는 벡터다. 같은 빛을 받아도 면의 방향에 따라 밝기가 달라지는 기준이다.

이번 구현은 평면 방향 성분 72%와 둥근 타원체의 부드러운 방향 성분 28%를 섞어 정규화한다. 원본 평면 계수는 완전히 단위 벡터가 아니므로 이것은 엄밀한 물리 기반 법선 보간이 아니라, 각진 돌과 부드러운 광택 사이를 조절하는 시각적 규칙이다.

여기에 작은 사인함수로 방향을 약간 흔들어 표면에 미세한 결이 있는 듯 표현한다. 실제 메시의 위치를 흔드는 변위가 아니므로 돌 외곽 형태는 유지된다.

## 6. 핵심 광택 A: 시점 의존 반사 조회

단순히 돌의 색을 밝게 만드는 대신, 카메라에서 본 표면 방향으로 광택의 위치가 바뀌게 한다.

원본은 평행한 시선의 직교 투영이므로 시선의 표면→카메라 방향을 `(0,0,1)`로 두었다.

```text
R = 2 * dot(N,V) * N - V
u = R.x
v = R.y
```

이 u,v는 모델에 붙은 전통적인 UV 언랩 좌표가 아니라, **반사 방향에서 얻은 광택 조회 좌표**다. 반사 방향을 이용하는 환경 매핑 계열의 시각적 아이디어를 사용하지만, 큐브맵/HDRI/실제 주변 환경 이미지를 로드하지는 않는다.

뷰어에서도 직교 카메라를 사용하고 카메라 공간의 법선으로 계산한다. 마우스로 시점을 돌리면 보이는 면과 카메라 공간 법선이 달라져 광택 패턴이 달라진다. 단순한 고정 UV 영상보다 돌을 감싸는 느낌을 주는 핵심이다.

## 7. 핵심 광택 B: 시간에 따라 흐르는 무늬

반사 좌표 u,v와 시간 t를 사용해 빛의 리본과 가는 안개 같은 무늬를 만든다.

원본 수식 일부:

```python
flow = sin(5*u + 3*v - 1.6*t + 1.2*sin(3*v + 0.65*t))
ribbons = exp(-((flow - 0.56) / 0.18)**2)
wisps = exp(-((sin(7*v - 2*u + 0.9*t + sin(4*u)) + 0.25) / 0.25)**2)
```

`sin`으로 부드럽게 반복되는 파동을 만들고, `exp`로 특정 구간을 얇고 밝은 띠로 모은다. 시간 항이 변하므로 카메라를 움직이지 않아도 빛이 흐른다. 이 패턴은 반사 조회와 결합돼 있어 시점을 움직일 때도 달라진다.

## 8. 핵심 광택 C: 표면에 붙은 스크롤 패턴

시점 의존 광택과 별도로 모델의 로컬 표면 위치를 이용한 패턴을 약하게 섞었다.

```python
surfuv = p.x*3.8 + p.y*2.4 + sin(p.z*5) - t*0.7
scroll = exp(-(sin(surfuv) / 0.26)**2)
```

시간이 늘어나면 무늬가 표면을 따라 이동한다. 다만 이번 결과에는 별도 UV 맵이나 광원 이미지 파일이 없다. **텍스처 스크롤과 같은 성격의 좌표 이동을 절차적 함수로 구현한 것**이다.

카메라 의존 리본, 가는 무늬, 표면 스크롤을 각각 `0.66`, `0.25`, `0.18` 가중치로 혼합하고, 정면에 가까운 면을 더 잘 보이게 조절한다. 단순 UV 스크롤만으로 설명하면 이번 결과의 시점 반응을 빠뜨리게 된다.

## 9. 색을 겹쳐 광채를 만드는 방법

은청색 `(0.18, 0.63, 1.0)`을 주된 흐름에 사용하고, 금빛 `(1.0, 0.62, 0.18)`을 별도의 얇은 띠에 사용한다. 여기에 하프 벡터 기반의 작은 반사 하이라이트를 더한다.

```text
최종 돌 색 = 기본 돌 색 + 흐르는 빛 색 + 반사 하이라이트
```

중요한 구분: 대화에서 알파 블렌딩과 가산 블렌딩을 논의했지만, **원본 돌의 표면은 Python 배열에서 색을 더하는 방식**이다. 별도 반투명 메시를 알파 블렌딩하고 다시 가산 블렌딩하는 DirectX 2패스 렌더링을 실행한 것이 아니다. Three.js 뷰어의 돌도 불투명 ShaderMaterial 안에서 색을 더한다. 바닥의 부드러운 그림자는 별도 투명 평면이지만 강화 광택의 알파 패스가 아니다.

따라서 `TGlowAndTexture`의 실제 호출이나 씰온라인의 2패스 재현이라고 표현하면 틀리다. 그 코드와 공통인 것은 빛을 더해 밝게 보이게 하는 합성 아이디어다.

## 10. 블룸은 약한 후처리일 뿐

원본에서는 발광 색에서 약한 부분을 제외하고, Pillow GaussianBlur(radius=9)로 흐린 다음 작은 비율로 화면에 더했다. 강한 주변 아우라나 입자 없이 표면의 빛에 작은 번짐만 준다.

뷰어는 장면을 렌더 타깃에 그린 뒤, 화면 공간에서 밝은 부분을 주변 16방향으로 샘플링해 약하게 더한다. 원본 Gaussian Blur와 동일한 커널이 아니므로 블룸은 근사 표현이다. 마지막 색 변환도 원본의 `pow(color,0.9)` 스타일을 따른다. 물리 기반 HDR 렌더러나 정밀한 색 관리 파이프라인은 아니다.

## 11. 기존 시안과 새 뷰어의 관계

- 원본: Python/NumPy가 픽셀마다 계산한 PNG/MP4, 제한된 회전 시연.
- 뷰어: 같은 38개 평면에서 추출한 삼각형 메시, Three.js가 GPU에서 광택 수식을 계산, 자유로운 시점 조작.
- 돌의 형상과 난수 시드는 동일하다.
- 후처리, 화면 크기, 면 샘플링, 조명 기준은 완전히 같지 않다. 이미지와 실시간 뷰어의 픽셀 일치는 보장하지 않는다.
- 원본 파일은 변경하지 않는다. 새 뷰어를 만들었다고 기존 PNG/MP4를 다시 생성하지 않는다.

## 12. 마우스 보기 페이지 사용법

파일:
`Graphic_designer/game_resource_library/source-art/glowing_stone/glowing-stone-viewer.html`

HTML 하나에 Three.js, OrbitControls, 형상 데이터, 셰이더, UI를 포함했다. 실행할 때 외부 CDN이나 인터넷에 접속하지 않으며, 로컬 서버도 필수는 아니다. WebGL과 import map을 지원하는 최신 Chrome/Edge에서 파일을 열면 된다. Telegram의 내장 미리보기에서는 실행이 제한될 수 있으므로 파일을 저장한 뒤 일반 브라우저로 연다.

- 왼쪽 드래그: 시점 회전. 이미지 평면을 회전하는 것이 아니라 실제 삼각형 입체를 둘러본다.
- 휠: 확대/축소.
- 오른쪽 드래그: 화면 이동.
- 터치: 한 손가락 회전, 두 손가락 확대/이동.
- 빛 흐름 일시정지: 시간을 멈춘다. 멈춘 상태에서도 마우스로 시점을 돌려 시점 의존 광택을 확인할 수 있다.
- 광택 켜기/끄기: 같은 돌의 기본 재질과 비교.
- 시점 의존 광택/표면 스크롤: 두 성분을 각각 분리해 확인.
- 강도·속도·블룸: 원하는 표현으로 조절.
- 삼각형 구조 보기: 메시 구조를 선으로 확인.
- 현재 화면 PNG 저장: 현재 시점을 이미지로 내려받기.
- 정면 시점 복귀: 카메라와 확대 상태 초기화.

이 조절값은 페이지 내부 메모리에만 있다. 파일·localStorage·Firebase에 저장하지 않으며, 게임의 그래픽 설정에 적용하지 않는다.

## 13. 파일 구성과 재현 명령

원본 시안 및 보기 페이지:
`Graphic_designer/game_resource_library/source-art/glowing_stone/`

- `render_stone.py`: 원본 시안 제작 코드.
- `glowing-stone.png`, `stone-comparison.png`, `glowing-stone.mp4`: 사용자가 긍정 평가한 원본 산출물.
- `manifest.json`: 기존 원본 파일 기록, 수정하지 않음.
- `glowing-stone-viewer.html`: 추가한 독립형 3D 보기 페이지.
- `viewer-manifest.json`: 새 뷰어/문서/소스의 파일 기록.

뷰어 제작 코드:
`Developer/prototypes/glowing_stone/`

- `make_geometry.py`: 동일한 평면 조건에서 메시 재생성.
- `stone_geometry.json`: 삼각형 좌표와 면 방향.
- `viewer.js`: Three.js/GLSL/조작 UI.
- `viewer.template.html`: 한국어 페이지 골격.
- `build_viewer.py`: 설치된 Three.js 모듈을 data URI로 넣어 독립형 HTML 생성.
- `THREE_LICENSE.txt`: 포함 라이브러리의 MIT 라이선스 보존.

저장소 루트에서 뷰어 재생성:

```bash
python Developer/prototypes/glowing_stone/make_geometry.py
python Developer/prototypes/glowing_stone/build_viewer.py
```

첫 명령은 NumPy가 필요하고, 두 번째는 프로젝트에 설치된 `Developer/r3f_prototype/node_modules/three`를 읽는다. 재생성 명령은 `stone_geometry.json`과 뷰어 HTML을 갱신하므로 사용자가 수정한 버전은 먼저 별도 보존한다. 기존 PNG/MP4는 갱신하지 않는다.

원본 시안 코드는 실행된 파일의 폴더에 PNG/MP4를 출력한다. 승인된 보관본을 덮어쓰지 않으려면 `render_stone.py`를 별도 작업 폴더에 복사해 실행한다. 필요 라이브러리는 NumPy, Pillow, OpenCV다.

## 14. 검증 결과와 범위

검증 증거:
`Quaility_Assurance/glowing_stone_viewer/verification.json`

설치된 Chrome에서 `file://`로 실제 페이지를 열어 검증했다. 오프라인 로딩, WebGL 셰이더, 시간 정지/재생, 마우스 회전, 휠 확대, 시점 복귀, 기본/광택 전환, 두 광택 성분 분리, 강도 조절, 와이어프레임, PNG 저장, 모바일 레이아웃을 확인했다. 외부 HTTP 요청 0건, 콘솔/페이지 오류 0건. 확인 시점의 GPU/브라우저에서 통과한 것이며 모든 기기에서의 성능을 보장하는 결과는 아니다.

원본 PNG/MP4/렌더 코드는 기존 manifest와 SHA-256이 동일한지 확인한다. 게임 본편, Firebase, Graphics Studio, 타이틀 화면, Android/AAB, 배포, Git commit/push는 변경하지 않았다. 게임 적용 완료나 성능 최적화 완료라고 주장하지 않는다.

전문가 라우팅 기록은 이 구현 문서와 개발 소스를 `threemini` 자산/셰이더 검토용 산출물로 남긴다. 이 세션에서는 노출된 도구에 Kanban/spawn 기능이 없어 실제 specialist worker 실행이나 Kanban 완료를 주장하지 않는다.

## 15. 다른 물체로 옮길 때의 설계 원칙

향후 무기 등에 적용할 때는 형상을 그대로 가져오는 것이 아니라, 해당 메시의 표면 위치·법선으로 광택 계산을 수행한다. 돌 특유의 타원체 법선 보정은 일반 무기에 그대로 사용하면 안 되고, 무기 자체의 법선과 원하는 결을 사용해야 한다.

- 기본 외형 재질과 광택 레이어의 수식을 분리한다.
- 정지 카메라/정지 모델에서 시간 흐름을 확인한다.
- 시간을 멈추고 시점만 바꿔 시점 반응을 확인한다.
- 단순 밝기·색 변경과 무늬 자체 변경을 구분한다.
- 강화 단계별 색·무늬·속도는 사용자가 정한 새 사양으로 데이터화한다. 씰온라인의 과거 단계별 사양을 추측해 복원했다고 주장하지 않는다.
- 모바일에서는 삼각형 수뿐 아니라 화면 픽셀 수, 반사 수식, 후처리 샘플 수를 함께 측정한다. 이번 시안의 블룸을 게임 전체에 무조건 적용하지 않는다.

현재 요청은 **제작 방법 문서화 + 독립형 보기 페이지**이며, 무기/게임 런타임 통합은 수행하지 않았다.

## 부록: 승인된 원본 Python 제작 코드

아래 코드는 현재 보관된 `render_stone.py` 내용을 그대로 기록한 것이다. 설명 문서의 수식과 실제 제작 과정을 대조하기 위한 원본이며, 자동 실행하지 않는다.

```python
import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageFont
from pathlib import Path
import cv2, math
OUT=Path(__file__).parent
W,H=720,540
Y,X=np.mgrid[0:H,0:W].astype(np.float32)
x=(X-W/2)/172; y=-(Y-270)/172
rng=np.random.default_rng(31)
k=np.arange(38); nz=1-2*(k+.5)/38; phi=k*2.399963229728653
planes=np.stack([np.sqrt(1-nz*nz)*np.cos(phi),np.sqrt(1-nz*nz)*np.sin(phi),nz],1).astype(np.float32)
planes[:,0]/=1.13; planes[:,1]/=.94; planes[:,2]/=.87
D=(.92+rng.uniform(-.075,.075,38)).astype(np.float32)
fontpath=Path("C:/Windows/Fonts/malgun.ttf")
font=ImageFont.truetype(str(fontpath),23) if fontpath.exists() else ImageFont.load_default()
small=ImageFont.truetype(str(fontpath),15) if fontpath.exists() else ImageFont.load_default()
def render(frame,plain=False):
 t=frame/24
 angle=0 if t<2 else .65*np.sin((t-2)/3*math.pi)
 c,s=np.cos(angle),np.sin(angle)
 R=np.array([[c,0,s],[0,1,0],[-s,0,c]],np.float32)
 P=planes@R.T
 front=np.full((H,W),1e4,np.float32); back=np.full((H,W),-1e4,np.float32); face=np.zeros((H,W),np.int16)
 for j,n in enumerate(P):
  if abs(n[2])<1e-5: continue
  z=(D[j]-n[0]*x-n[1]*y)/n[2]
  if n[2]>0:
   m=z<front; front[m]=z[m]; face[m]=j
  else: back=np.maximum(back,z)
 mask=(front>=back)&(front<3)&(back>-3)
 z=np.where(mask,front,0)
 pos=np.stack([x,y,z],-1)@R
 normal=P[face].copy(); smooth=np.stack([x/1.13**2,y/.94**2,z/.87**2],-1)
 smooth/=np.maximum(np.linalg.norm(smooth,axis=-1,keepdims=True),.001)
 normal=.72*normal+.28*smooth
 rough=np.sin(pos[:,:,0]*26+pos[:,:,1]*19)*np.cos(pos[:,:,2]*23-pos[:,:,1]*29)
 normal[:,:,0]+=.027*rough; normal[:,:,1]+=.022*np.sin(pos[:,:,0]*39+pos[:,:,2]*17)
 normal/=np.maximum(np.linalg.norm(normal,axis=-1,keepdims=True),.001)
 light=np.array([-.45,.75,.65]); light/=np.linalg.norm(light)
 diffuse=np.maximum(normal@light,0)
 grain=.5+.5*np.sin(pos[:,:,0]*65+pos[:,:,1]*32)*np.sin(pos[:,:,2]*57+pos[:,:,1]*74)
 marble=np.sin(pos[:,:,0]*8+pos[:,:,1]*5+np.sin(pos[:,:,2]*7))
 base=np.array([.29,.32,.36])[None,None,:]*(.38+.65*diffuse[:,:,None])
 base=base*(.86+.12*grain[:,:,None])+.025*marble[:,:,None]
 # View-dependent reflection lookup plus time-scrolling luminous texture.
 refl=2*normal[:,:,2,None]*normal-np.array([0,0,1])
 u=refl[:,:,0]; v=refl[:,:,1]
 flow=np.sin(5*u+3*v-t*1.6+1.2*np.sin(3*v+t*.65))
 ribbons=np.exp(-((flow-.56)/.18)**2)
 wisps=np.exp(-((np.sin(7*v-2*u+t*.9+np.sin(u*4))+.25)/.25)**2)
 surfuv=pos[:,:,0]*3.8+pos[:,:,1]*2.4+np.sin(pos[:,:,2]*5)-t*.7
 scroll=np.exp(-(np.sin(surfuv)/.26)**2)
 strength=(.66*ribbons+.25*wisps+.18*scroll)*(.3+.7*np.clip(normal[:,:,2],0,1))
 colors=np.array([.18,.63,1.0])[None,None,:]*strength[:,:,None]
 golden=np.exp(-((np.sin(u*4-v*3-t*.8)-.75)/.14)**2)*.5
 colors+=np.array([1.0,.62,.18])[None,None,:]*golden[:,:,None]
 half=light+np.array([0,0,1]); half/=np.linalg.norm(half)
 spec=np.maximum(normal@half,0)**40
 if not plain: base+=colors+spec[:,:,None]*.65
 else: base+=spec[:,:,None]*.12
 # Minimal bloom from the surface only; no particles or surrounding aura.
 emission=np.clip((colors-.3)*.6,0,1)*mask[:,:,None] if not plain else np.zeros_like(base)
 glow=Image.fromarray(np.uint8(emission*255)).filter(ImageFilter.GaussianBlur(9))
 bg=np.zeros((H,W,3),np.float32); bg[:]=[.035,.045,.065]
 radial=np.exp(-((x*.55)**2+(y*.55)**2))
 bg+=radial[:,:,None]*np.array([.025,.035,.05])
 ground=np.exp(-((X-W/2)/160)**2-((Y-447)/19)**2)
 bg*=1-.7*ground[:,:,None]
 rgb=np.where(mask[:,:,None],np.clip(base,0,1),bg)+np.asarray(glow)/255*.38
 im=Image.fromarray(np.uint8(np.clip(rgb,0,1)**.9*255))
 dr=ImageDraw.Draw(im)
 dr.text((30,22),"빛나는 돌 · 표면 광택 시안" if not plain else "기본 돌 · 광택 적용 전",font=font,fill=(224,233,247))
 dr.text((30,57),"스크롤 텍스처 + 시점 의존 광택 + 가산 합성",font=small,fill=(139,162,190))
 if not plain:
  dr.text((30,H-36),"카메라 고정 · 빛의 흐름" if t<2 else "시점 회전 · 표면 반응",font=small,fill=(170,193,216))
 dr.text((W-193,H-36),"SEAL 원본 복원 아님",font=small,fill=(124,141,165))
 return im
render(24).save(OUT/"glowing-stone.png")
a=render(24,True); b=render(24); comp=Image.new("RGB",(W*2,H)); comp.paste(a,(0,0)); comp.paste(b,(W,0)); comp.save(OUT/"stone-comparison.png")
writer=cv2.VideoWriter(str(OUT/"glowing-stone.mp4"),cv2.VideoWriter_fourcc(*"mp4v"),24,(W,H))
if not writer.isOpened(): raise RuntimeError("MP4 writer unavailable")
for f in range(120):
 writer.write(cv2.cvtColor(np.asarray(render(f)),cv2.COLOR_RGB2BGR))
writer.release()
cap=cv2.VideoCapture(str(OUT/"glowing-stone.mp4")); n=int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); ok,im=cap.read(); cap.release()
assert ok and n==120
Image.open(OUT/"glowing-stone.png").verify()
print("VERIFIED",n,"frames; PNG and MP4", [(f.name,f.stat().st_size) for f in OUT.iterdir()])

```
